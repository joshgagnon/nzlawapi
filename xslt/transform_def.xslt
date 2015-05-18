
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:import href="common.xslt"/>
    <xsl:import href="bill.xslt" />
    <xsl:import href="equations.xslt" />
    <xsl:import href="tables.xslt" />
    <xsl:import href="end.xslt" />
    <xsl:import href="schedules.xslt" />
    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space"> ,.;:'`’")(</xsl:variable>


    <xsl:template match="/">
        <xsl:apply-templates select="catalex-def-para"/>
    </xsl:template>

        <xsl:template match="catalex-def-para">
            <div class="definition-result">
                <div class="legislation">
                    <xsl:apply-templates select="text|def-para|para|catalex-src"/>
                </div>
        </div>
    </xsl:template>

    <xsl:template name="quote">
    </xsl:template>

    <xsl:template name="current">
    </xsl:template>

    <xsl:template name="parentquote">
    </xsl:template>
    <xsl:template name="openbracket">
    <xsl:if test="not(contains(. ,'('))">(</xsl:if>
    </xsl:template>

    <xsl:template name="closebracket">
    <xsl:if test="not(contains(. ,'('))">)</xsl:if>
    </xsl:template>

    <xsl:template name="bracketlocation">
        <xsl:param name="label" />
        <xsl:choose>
            <xsl:when test="not(contains($label ,'('))">(<xsl:value-of select="$label"/>)</xsl:when>
            <xsl:otherwise><xsl:value-of select="$label"/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <xsl:template match="def-para|para">
                <div class="def-para">
                     <xsl:attribute name="id">
                        <xsl:value-of select="@id"/>
                    </xsl:attribute>
                    <p class="text">
                         <xsl:apply-templates select="para/text|para/label-para|example|text|label-para|amend"/>
                    </p>
                </div>
    </xsl:template>


    <xsl:template match="catalex-src[@href]">
        <span class="catalex-src">
        Source: <a >
        <xsl:attribute name="href">/open_article/<xsl:value-of select="@href"/></xsl:attribute>
        <xsl:attribute name="data-href"><xsl:value-of select="@href"/></xsl:attribute>
        <xsl:attribute name="data-link-id"><xsl:value-of select="@link-id"/></xsl:attribute>
        <xsl:attribute name="data-target-id"><xsl:value-of select="@target-id"/></xsl:attribute>
        <xsl:attribute name="data-location"><xsl:value-of select="@location"/></xsl:attribute>
            <xsl:value-of select="."/>
        </a>
        </span>
    </xsl:template>

</xsl:stylesheet>