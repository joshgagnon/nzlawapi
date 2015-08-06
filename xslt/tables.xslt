<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">


    <!-- Recursive template -->
    <xsl:template name="calculate-total">
        <!-- Select by default the set of width from the current context -->
        <xsl:param name="width"
                   select="../colspec[contains(@colwidth, '*')]" />
        <!-- Param which is going to keep track of the result step by step -->
        <xsl:param name="total"
                   select="'0'" />
        <xsl:choose>
            <!-- If we have remaining order details, recurse -->
            <xsl:when test="$width">
              <xsl:variable name="element" select="$width[1]"/>
                <xsl:call-template name="calculate-total">

                    <xsl:with-param name="width"
                                    select="$width[position() > 1]" />

                    <xsl:with-param name="total"
                                    select="$total + number(substring-before($element/@colwidth, '*'))" />
                </xsl:call-template>
            </xsl:when>
            <!-- Output the result -->
            <xsl:otherwise>
                <xsl:value-of select="$total" />
            </xsl:otherwise>
        </xsl:choose>

    </xsl:template>

  <xsl:template match="table[not(ancestor::eqn)]">
    <div>
      <table width="100%">
      <xsl:attribute name="class">
      <xsl:if test="@frame"> frame-<xsl:value-of select="@frame"/> </xsl:if>
      <xsl:if test="@align != ''">
         table-align-<xsl:value-of select="@align"/>
      </xsl:if>
    </xsl:attribute>
        <xsl:attribute name="id">
          <xsl:value-of select="@id"/>
        </xsl:attribute>
        <xsl:if test="@fontsize = '10.5'">
          <xsl:attribute name="style">font-size:small</xsl:attribute>
        </xsl:if>

        <colgroup>
        <xsl:apply-templates select="tgroup/colspec"/>
      </colgroup>
      <xsl:apply-templates select="tgroup/thead"/>
      <tbody>

        <xsl:apply-templates select="tgroup/tbody/row"/>
      </tbody>
    </table>
  </div>
</xsl:template>

<xsl:template match="thead">
  <thead>
    <xsl:apply-templates select="row"/>
  </thead>
</xsl:template>

<xsl:template match="row">
  <tr class="row">
    <xsl:apply-templates select="entry"/>
  </tr>
</xsl:template>


<xsl:template match="colspec">
  <col>
  <xsl:attribute name="style">
    <xsl:choose>
      <xsl:when test="contains(@colwidth, '*')">
        <xsl:variable name="cols">
            <xsl:call-template name="calculate-total" />
        </xsl:variable>
          width:<xsl:value-of select="100.0 div $cols * number(substring-before(@colwidth, '*'))"/>%;
      </xsl:when>
      <xsl:otherwise>
            width:<xsl:value-of select='@colwidth'/>
      </xsl:otherwise>
    </xsl:choose>
    <xsl:if test="@align != ''">
      text-align:<xsl:value-of select="@align"/>;
    </xsl:if>
  </xsl:attribute>
</col>
</xsl:template>


<xsl:template name="get-span">
  <xsl:variable name="start" select="@namest" />
  <xsl:variable name="end" select="@nameend" />
  <xsl:variable name="start_pos">
    <xsl:for-each select="../../../colspec[@colname = $start]">
         <xsl:value-of select="count(preceding-sibling::*)" />
    </xsl:for-each>
  </xsl:variable>
  <xsl:variable name="end_pos">
    <xsl:for-each select="../../../colspec[@colname = $end]">
         <xsl:value-of select="count(preceding-sibling::*)" />
    </xsl:for-each>
  </xsl:variable>
  <xsl:value-of select="$end_pos - $start_pos + 1" />
</xsl:template>


<xsl:template name="cell">

  <xsl:variable name="pos" select="position()" />
    <xsl:attribute name="class">
      <xsl:choose>
        <xsl:when test="@colsep='1' or (not(@colsep) and ../@colsep = '1') or (not(@colsep) and ../../../colspec[$pos]/@colsep = '1')"> colsep-yes </xsl:when>
        <xsl:otherwise> colsep-no </xsl:otherwise>
      </xsl:choose>
      <xsl:choose>
        <xsl:when test="@rowsep='1' or  (not(@rowsep) and ../@rowsep = '1') or  (not(@rowsep) and ../../../colspec[$pos]/@rowsep = '1')"> rowsep-yes </xsl:when>
        <xsl:otherwise> rowsep-no </xsl:otherwise>
      </xsl:choose>
       <xsl:if test="../../../colspec[$pos]/@align"> align-<xsl:value-of select="../../../colspec[$pos]/@align"/>
      </xsl:if>
      <xsl:if test="@align"> align-<xsl:value-of select="@align"/></xsl:if>
    </xsl:attribute>
    <xsl:if test="@namest">
        <xsl:variable name="startname" select="@namest" />
        <xsl:variable name="endname" select="@nameend" />

        <xsl:attribute name="colspan">
          <xsl:call-template name="get-span"></xsl:call-template>
        </xsl:attribute>

    </xsl:if>
  <xsl:apply-templates />
</xsl:template>

<xsl:template match="entry">
<td>
    <xsl:call-template name="cell"/>
  <xsl:choose>
    <xsl:when test="not(node()) and not(string()) or text()=' '">&#160;</xsl:when>
  </xsl:choose>
</td>
</xsl:template>

<xsl:template match="thead/row/entry">
  <th>
    <xsl:call-template name="cell"/>
  </th>
</xsl:template>

<xsl:template match="legtable/summary"></xsl:template>

</xsl:stylesheet>