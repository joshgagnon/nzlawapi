 <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="table[not(ancestor::eqn)]">
        <div>
            <xsl:if test="@frame = 'none'">
               <xsl:attribute name="class">tableFullWidth</xsl:attribute>
            </xsl:if>
        <table>
             <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
             <xsl:if test="@fontsize = '10.5'">
               <xsl:attribute name="style">
                   font-size:small
                </xsl:attribute>

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
           <xsl:attribute name="style">width:<xsl:value-of select="@colwidth"/>;
            <xsl:if test="@align">text-align:<xsl:value-of select="@align"/>;</xsl:if>
            </xsl:attribute>
        </col>
    </xsl:template>

    <xsl:template match="entry">
        <td>
             <xsl:if test="count(following-sibling::entry) = 0">
                  <xsl:attribute name="colspan">
                        <xsl:value-of select="4-count(preceding-sibling::entry)"/>
                    </xsl:attribute>
            </xsl:if>
           <xsl:if test="@align">
           <xsl:attribute name="style">text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            </xsl:if>
            <xsl:choose>
                <xsl:when test="not(node()) and not(string())">&#160;
                </xsl:when>
                <xsl:otherwise>
                    <xsl:apply-templates />
                </xsl:otherwise>
            </xsl:choose>
        </td>
    </xsl:template>


</xsl:stylesheet>